require_relative("../../Rakefile-init")

projects = {
    "DDx" => "./DDx",    
    "Asteroids" => "./Asteroids", 
    "Scribble" => "./Scribble"
}

project = "HTML5 Samples"

task :setup do
	
	projects.each do |name, project|
		sh("cd #{project} && rake setup")
	end
end

task :install do	
end

task :build do
end

task :deploy do
	
	projects.each do |name, project|
		sh("cd #{project} && rake deploy")
	end
end

task :clean do 
	
	projects.each do |name, project|
		sh("cd #{project} && rake clean")
	end	
end

task :stage => [:setup] do
	
	projects.each do |name, project|
		sh("cd #{project} && rake stage")
	end
end

task :stageclean do
	
	projects.each do |name, project|
		sh("cd #{project} && rake stageclean")
	end
end

task :package do
	
	projects.each do |name, project|
		sh("cd #{project} && rake package")
	end
end

task :packageclean do

	projects.each do |name, project|
		sh("cd #{project} && rake packageclean")
	end
end

task :cleanall do
	
	projects.each do |name, project|
		sh("cd #{project} && rake clean")
	end
	projects.each do |name, project|
		sh("cd #{project} && rake stageclean")
	end	
end

desc "Test #{project}"	
task :test do    
   	puts "task: 'test' not implemented for samples"
end

desc "Upload to S3 #{project}"	
task :upload_to_s3 do    
   	projectname = File.basename(File.dirname(__FILE__))
    repo_source_description = `git describe --long`.strip().match(/^(?<version>.*?)(-(?<variant>.*?))?-(?<revision>.*?)-(?<hash>.*?)$/)
    version = repo_source_description['version']    
    puts ("Attempting to uploading #{project} to AWS S3")    	

	projects.each do |name, project|        
		filename = "pureweb-sample-HTML5-client-#{name}"
		puts "looking for #{PUREWEB_HOME}/../pkg/#{filename}.zip"
	    if File.exists?("#{PUREWEB_HOME}/../pkg/#{filename}.zip")

	        #upload to the versioned directory
	        sh("aws s3 cp #{PUREWEB_HOME}/../pkg/#{filename}.zip s3://pureweb.io-binaries/continuous/samples/#{projectname}/#{version}/#{repo_source_description}/#{filename}.zip")

	        #given that this should only ever be run from a build machine, we can assume that this build also represents the 'latest' build
	        sh("aws s3 cp s3://pureweb.io-binaries/continuous/samples/#{projectname}/#{version}/#{repo_source_description}/#{filename}.zip s3://pureweb.io-binaries/continuous/samples/#{projectname}/latest/#{filename}.zip")
	    else
	        puts("No file found.  Skipping upload.")
	    end
	end
end

task :all => [:stage] do
end

task :default do	
	sh("rake -T")
end
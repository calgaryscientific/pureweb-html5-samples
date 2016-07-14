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

desc "Test #{project}"	
task :upload_to_s3 do    
   	puts "task: 'upload_to_s3' not implemented for samples"
end


task :all => [:stage] do
end

task :default do	
	sh("rake -T")
end
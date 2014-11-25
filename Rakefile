projects = {
    "DDx" => "./DDx",    
    "Asteroids" => "./Asteroids", 
    "Scribble" => "./Scribble"
}

PUREWEBHOME = ENV["PUREWEB_HOME"]

PROJECT = "HTML5 Samples"

task :clean do 
	projects.each do |name, project|
		sh("cd #{project} && rake clean")
	end	
end

task :stage do
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
	FileUtils.rm_r("#{PUREWEBHOME}/nginx/clients/lib/pureweb/", :force => true)	
end

task :all do
end